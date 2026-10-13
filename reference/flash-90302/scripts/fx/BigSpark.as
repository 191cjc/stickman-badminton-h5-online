package fx
{
   import bobby.§ null§;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol278")]
   public class BigSpark extends § null§
   {
      
      public function BigSpark()
      {
         addFrameScript(21,this.frame22);
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
      }
      
      internal function frame22() : *
      {
         stop();
         remove();
      }
   }
}

