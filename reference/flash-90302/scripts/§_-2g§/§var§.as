package §_-2g§
{
   import bobby.§ null§;
   import flash.events.Event;
   import flash.text.TextField;
   import flash.utils.setTimeout;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol97")]
   public class §var§ extends § null§
   {
      
      public var §_-§:TextField;
      
      public function §var§(param1:String)
      {
         addFrameScript(0,this.frame1);
         super();
         var _loc2_:String = param1;
         TextField(this.§_-§).text = _loc2_;
         if(TextField(this.§_-§).numLines <= 1)
         {
            _loc2_ = "\n" + _loc2_;
            TextField(this.§_-§).text = _loc2_;
         }
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         setTimeout(remove,3000);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

