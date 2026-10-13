package §_-2g§
{
   import bobby.§ null§;
   import bobby.§_-0v§;
   import flash.events.Event;
   import flash.text.TextField;
   import flash.utils.setTimeout;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol255")]
   public class §_-2P§ extends § null§
   {
      
      public var §_-V§:TextField;
      
      public var §finally§:TextField;
      
      public var §_-63§:TextField;
      
      public var §_-4p§:TextField;
      
      public var §_-2U§:TextField;
      
      private var fading:Boolean = false;
      
      public function §_-2P§()
      {
         addFrameScript(0,this.frame1);
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         var e:Event = param1;
         super.handleStageAdd(e);
         §_-0v§.§_-6-§(this.handleEnterFrame);
         setTimeout(function():*
         {
            fading = true;
         },2000);
      }
      
      public function set §_-3Z§(param1:String) : void
      {
         TextField(this.§finally§).text = param1;
         TextField(this.§_-63§).text = param1;
         if(TextField(this.§finally§).numLines <= 1)
         {
            TextField(this.§_-63§).visible = true;
            TextField(this.§finally§).visible = false;
         }
         else
         {
            TextField(this.§_-63§).visible = false;
            TextField(this.§finally§).visible = true;
         }
      }
      
      public function set §_-11§(param1:String) : void
      {
         TextField(this.§_-4p§).text = param1;
         TextField(this.§_-V§).text = param1;
         if(TextField(this.§_-4p§).numLines <= 1)
         {
            TextField(this.§_-V§).visible = true;
            TextField(this.§_-4p§).visible = false;
         }
         else
         {
            TextField(this.§_-V§).visible = false;
            TextField(this.§_-4p§).visible = true;
         }
      }
      
      public function set §_-2C§(param1:String) : void
      {
         TextField(this.§_-2U§).text = param1;
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(this.fading)
         {
            alpha -= 3 * param1;
         }
         if(alpha <= 0)
         {
            remove();
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         §_-0v§.§ do§(this.handleEnterFrame);
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

